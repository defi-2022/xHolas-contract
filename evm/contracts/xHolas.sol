// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';

import { IxHolas } from './interfaces/IxHolas.sol';
import { BytesLib } from './libs/BytesLib.sol';
import { xEngine } from './xEngine.sol';
import { IWormhole } from './Wormhole/IWormhole.sol';
import { ITokenBridge } from './Wormhole/ITokenBridge.sol';
import { BridgeStructs } from './Wormhole/BridgeStructs.sol';

contract xHolas is IxHolas, xEngine, Ownable {
    using BytesLib for bytes;

    event Log(string indexed str);

    event TokenTransferred(
        address indexed receiver,
        uint256 amount
    );

    event BridgeSentLog(
        uint16 targetChainId,
        address targetContractAddress,
        address originTokenAddress,
        uint256 amount,
        bytes payload
    );

    event BridgeReceivedLog(
        address wrappedAsset,
        uint8 payloadID,
        uint256 amount,
        address tokenAddress,
        uint16 tokenChain,
        bytes32 to,
        uint16 toChain,
        address fromAddress
    );

    event ChainExecutionDataLog(
        uint16 index,
        address[] tos,
        bytes32[] configs
    );

    IWormhole immutable CORE_BRIDGE;
    ITokenBridge immutable TOKEN_BRIDGE;
    address immutable TOKEN_BRIDGE_ADDRESS;

    // address FEE_TOKEN_ADDRESS = address(0);
    uint16 immutable WORMHOLE_CHAIN_ID;

    uint32 nonce = 0;
    uint16 DECIMALS = 10;

    bool internal lockedExecuteBridgeOrigin = false;

    mapping(uint16 => bytes32) private peerContracts;

    constructor(
        address _coreBridgeAddress,
        address _tokenBridgeAddress,
        uint16 _wormholeChainId
    ) {
        CORE_BRIDGE = IWormhole(_coreBridgeAddress);
        TOKEN_BRIDGE = ITokenBridge(_tokenBridgeAddress);
        TOKEN_BRIDGE_ADDRESS = _tokenBridgeAddress;
        WORMHOLE_CHAIN_ID = _wormholeChainId;
    }

    modifier nonReentrancyOnExecuteBridgeOrigin() {
        require(!lockedExecuteBridgeOrigin, 'Execute bridge is locked');
        lockedExecuteBridgeOrigin = true;
        _;
        lockedExecuteBridgeOrigin = false;
    }

    function bytesToAddress(bytes memory data) private pure returns (address addr) {
        bytes memory b = data;
        assembly {
            addr := mload(add(b, 20))
        }
    }

    function bytes32ToAddress(bytes32 bys) private pure returns (address) {
        return address(uint160(uint256(bys)));
    }

    function addressToBytes32(address addr) private pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)) << 96);
    }

    function bytesToBytes32(bytes memory bys) private pure returns (bytes32 bys32) {
        if (bys.length == 0) return 0x0;
        assembly {
            bys32 := mload(add(bys, 32))
        }
    }

    function updatePeerContract(uint16 peerChainId, bytes32 wormholeCompatAddress) external onlyOwner {
        peerContracts[peerChainId] = wormholeCompatAddress;
    }

    /**
     * @notice The execution interface for callback function to be executed.
     */
    function executeTransactionsEntryPoint(
        address[] memory tos,
        bytes32[] memory configs,
        uint16[] memory chainIds,
        bytes[] memory datas
    )
        external
        payable
//        isInitialized
        nonReentrancyOnExecuteBridgeOrigin
    {
        // require(msg.sender == address(this), "Does not allow external calls");
        require(tos.length == datas.length, "Tos and datas length inconsistent");
        require(tos.length == configs.length, "Tos and configs length inconsistent");
        require(tos.length == chainIds.length, "Tos and chainIds length inconsistent");

        uint16 count = 0;
        for (uint16 i = 0; i < tos.length; i++) {
            if (chainIds[i] != chainIds[0]) break;
            count += 1;
        }

        _execs(tos, configs, datas, 0, count);
        address relayedTokenAddress = _postProcess(tos.length > 0);

        if (tos.length > count) {
            uint16 targetChainId = chainIds[0];
            bytes32 targetContractAddress = peerContracts[targetChainId];
            bytes memory payload = abi.encode(_getSender(), tos, configs, chainIds, datas, 0 + count);

            if (relayedTokenAddress != address(0)) {
                // transfer with token
                uint256 amount = IERC20(relayedTokenAddress).balanceOf(address(this));
                // transfer token to this address for approval for token bridge
                IERC20(relayedTokenAddress).transferFrom(_getSender(), address(this), amount);
                // approve token bridge to move token amount to its contract (for locking & minting)
                IERC20(relayedTokenAddress).approve(TOKEN_BRIDGE_ADDRESS, amount);

                TOKEN_BRIDGE.transferTokensWithPayload(
                    relayedTokenAddress,
                    amount,
                    targetChainId,
                    targetContractAddress,
                    nonce,
                    payload
                );

                emit BridgeSentLog({
                    targetChainId: targetChainId,
                    targetContractAddress: bytes32ToAddress(targetContractAddress),
                    originTokenAddress: relayedTokenAddress,
                    amount: amount,
                    payload: payload
                });
            } else {
                // just send tx instructions
                CORE_BRIDGE.publishMessage(
                    nonce,
                    payload,
                    1 // consistencyLevel
                );

                emit BridgeSentLog({
                    targetChainId: targetChainId,
                    targetContractAddress: bytes32ToAddress(targetContractAddress),
                    originTokenAddress: bytes32ToAddress(bytes32(0)),
                    amount: 0,
                    payload: payload
                });
            }

            // slither-disable-next-line reentrancy-eth
            nonce += 1;
        }
    }

    function executeTransactionsRelayPoint(bytes memory encodedVm)
        external
        nonReentrancyOnExecuteBridgeOrigin
    {
        BridgeStructs.TransferWithPayload memory vaa = _decodeVaaPayload(TOKEN_BRIDGE.completeTransferWithPayload(encodedVm));
        (
            address recipient,
            address[] memory tos,
            bytes32[] memory configs,
            uint16[] memory chainIds,
            bytes[] memory datas,
            uint16 start
        ) = abi.decode(vaa.payload, (address, address[], bytes32[], uint16[], bytes[], uint16));

        uint16 count = 0;
        for (uint16 i = start; i < tos.length; i++) {
            if (chainIds[i] != chainIds[start]) break;
            count += 1;
        }

        // require(msg.sender == address(this), "Does not allow external calls");
        require(tos.length == datas.length, "Tos and datas length inconsistent");
        require(tos.length == configs.length, "Tos and configs length inconsistent");
        require(tos.length == chainIds.length, "Tos and chainIds length inconsistent");

        _execs(tos, configs, datas, start, count);
        address relayedTokenAddress = _postProcess(tos.length > start + count);

        if (tos.length > start + count) {
            uint16 targetChainId = chainIds[start];
            bytes32 targetContractAddress = peerContracts[targetChainId];
            bytes memory payload = abi.encode(recipient, tos, configs, chainIds, datas, start + count);

            if (relayedTokenAddress != address(0)) {
                // transfer with token
                uint256 amount = IERC20(relayedTokenAddress).balanceOf(address(this));
                // transfer token to this address for approval for token bridge
                IERC20(relayedTokenAddress).transferFrom(recipient, address(this), amount);
                // approve token bridge to move token amount to its contract (for locking & minting)
                IERC20(relayedTokenAddress).approve(TOKEN_BRIDGE_ADDRESS, amount);

                TOKEN_BRIDGE.transferTokensWithPayload(
                    relayedTokenAddress,
                    amount,
                    targetChainId,
                    targetContractAddress,
                    nonce,
                    payload
                );

                emit BridgeSentLog({
                    targetChainId: targetChainId,
                    targetContractAddress: bytes32ToAddress(targetContractAddress),
                    originTokenAddress: relayedTokenAddress,
                    amount: amount,
                    payload: payload
                });
            } else {
                // just send tx instructions
                CORE_BRIDGE.publishMessage(
                    nonce,
                    payload,
                    1 // consistencyLevel
                );

                emit BridgeSentLog({
                    targetChainId: targetChainId,
                    targetContractAddress: bytes32ToAddress(targetContractAddress),
                    originTokenAddress: bytes32ToAddress(bytes32(0)),
                    amount: 0,
                    payload: payload
                });
            }

            // slither-disable-next-line reentrancy-eth
            nonce += 1;
        }
    }

    function _decodeVaaPayload(bytes memory payload) private pure returns (BridgeStructs.TransferWithPayload memory) {
        BridgeStructs.TransferWithPayload memory decoded = BridgeStructs.TransferWithPayload({
            payloadID: payload.slice(0,1).toUint8(0),
            amount: payload.slice(1,32).toUint256(0),
            tokenAddress: payload.slice(33,32).toBytes32(0),
            tokenChain: payload.slice(65,2).toUint16(0),
            to: payload.slice(67,32).toBytes32(0),
            toChain: payload.slice(99,2).toUint16(0),
            fromAddress: payload.slice(101,32).toBytes32(0),
            payload: payload.slice(133, payload.length-133)
        });

        return decoded;
    }
}
