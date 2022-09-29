// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

interface IInstaEngine {
    function receiveAndExecute(
        bytes calldata encodedVaa
    ) external returns (uint256 amountOut);
}
