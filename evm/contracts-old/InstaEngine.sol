// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import { IERC20 } from '@openzeppelin/contracts/token/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ISwapRouter } from '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import { TransferHelper } from '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import { BytesLib } from 'solidity-bytes-utils/contracts/BytesLib.sol';

import { IDSA } from './interfaces/IDSA.sol';
import {IInstaEngine} from './interfaces/IInstaEngine.sol';
import { IInstaIndex } from './interfaces/IInstaIndex.sol';
import { ITokenBridge } from './interfaces/ITokenBridge.sol';
import { SwapHelper } from './helpers/SwapHelper.sol';

interface IUniswapRouter is ISwapRouter {
    function refundETH() external payable;
}

contract InstaEngine is IInstaEngine {
    using SafeERC20 for IERC20;
    using BytesLib for bytes;

    IInstaIndex public immutable INSTA_INDEX;
    ITokenBridge public immutable TOKEN_BRIDGE;
    IUniswapRouter public immutable SWAP_ROUTER;

    address public immutable FEE_TOKEN_ADDRESS;
    address public immutable WRAPPED_NATIVE;

    constructor(
        address _instaIndexAddress,
        address _swapRouterAddress,
        address _feeTokenAddress,
        address _tokenBridgeAddress,
        address _wrappedNativeAddress
    ) {
        INSTA_INDEX = IInstaIndex(_instaIndexAddress);
        TOKEN_BRIDGE = ITokenBridge(_tokenBridgeAddress);
        SWAP_ROUTER = IUniswapRouter(_swapRouterAddress);
        FEE_TOKEN_ADDRESS = _feeTokenAddress;
        WRAPPED_NATIVE = _wrappedNativeAddress;
    }


    /// @dev Returns the parsed TokenBridge payload which contains swap
    /// instructions after redeeming the VAA from the TokenBridge
    function _getParsedPayload(
        bytes calldata encodedVaa
    //        uint8 swapFunctionType
    ) private returns (SwapHelper.DecodedVaaParameters memory payload) {
        // complete the transfer on the token bridge & parse the payload
        payload = SwapHelper.decodeVaaPayload(
            TOKEN_BRIDGE.completeTransferWithPayload(encodedVaa) // vmPayload
        );

        // sanity check payload parameters
        //        require(
        //            payload.swapFunctionType==swapFunctionType,
        //            "incorrect swapFunctionType in payload"
        //        );
    }

    function createStrategy(
        string[] memory _targets,
        bytes[] memory _chainIds,
        bytes[] memory _data
    ) external payable {
        // creating a smart account (make sure to use delegatecall to preserve msg.sender)
        address account = instaIndex.build(msg.sender, 2, address(0)); // 2 is the most recent DSA version

        bytes chainId = 0;
        for (uint i = 0; i < _chainIds.length; i++) {
            if (_chainIds[i] == 0) continue; // ignore deleted chainId
            if ()
            delete _chainIds[i];
        }

        IDSA(_account).cast(_targets, _data, address(0));

        TokenBridge(TOKEN_BRIDGE_ADDRESS).transferTokensWithPayload(
            FEE_TOKEN_ADDRESS,
            amountOut, // <<
            targetChainId,
            targetContractAddress,
            nonce,
            bytes4([
                keccak256("deposit(address,uint256,uint256,uint256)"),
                keccak256("deposit(string,uint256,uint256,uint256)")
            ])
        );
    }

    function receiveAndExecute(
        bytes calldata encodedVaa
    ) external returns (uint256 amountOut) {
        // redeem and fetch parsed payload
        SwapHelper.DecodedVaaParameters memory payload = _getParsedPayload(encodedVaa);

        // sanity check path
        require(
            payload.path[0]==FEE_TOKEN_ADDRESS,
            "tokenIn must be feeToken"
        );
        require(
            payload.path[1]==WRAPPED_NATIVE,
            "tokenOut must be wrapped Native"
        );

        // approve the router to spend tokens
        TransferHelper.safeApprove(
            payload.path[0],
            address(SWAP_ROUTER),
            payload.swapAmount
        );

        // set swap options with user params
        ISwapRouter.ExactInputSingleParams memory params =
        ISwapRouter.ExactInputSingleParams({
        tokenIn: payload.path[0],
        tokenOut: payload.path[1],
        fee: payload.poolFee,
        recipient: address(this),
        deadline: payload.deadline,
        amountIn: payload.swapAmount,
        amountOutMinimum: payload.estimatedAmount,
        sqrtPriceLimitX96: 0
        });

        // try to execute the swap
        try SWAP_ROUTER.exactInputSingle(params) returns (uint256 amountOut) {
            // calculate how much to pay the relayer in the native token
            uint256 nativeRelayerFee = amountOut * payload.relayerFee / payload.swapAmount;
            uint256 nativeAmountOut = amountOut - nativeRelayerFee;

            // unwrap native and send to recipient
            IWETH(WRAPPED_NATIVE).withdraw(amountOut);
            payable(payload.recipientAddress).transfer(nativeAmountOut);

            /// pay the relayer in the native token
            payable(msg.sender).transfer(nativeRelayerFee);

            // used in UI to tell user they're getting
            // their desired token
            emit SwapResult(
                payload.recipientAddress,
                payload.path[1],
                msg.sender,
                nativeAmountOut,
                1
            );
            return amountOut;
        } catch {
            // pay relayer in the feeToken since the swap failed
            IERC20 feeToken = IERC20(FEE_TOKEN_ADDRESS);
            feeToken.safeTransfer(msg.sender, payload.relayerFee);

            // swap failed - return feeToken (less relayer fees) to recipient
            feeToken.safeTransfer(
                payload.recipientAddress,
                payload.swapAmount - payload.relayerFee
            );

            // used in UI to tell user they're getting
            // feeToken instead of their desired native asset
            emit SwapResult(
                payload.recipientAddress,
                payload.path[0],
                msg.sender,
                payload.swapAmount - payload.relayerFee,
                0
            );
        }
    }
}
