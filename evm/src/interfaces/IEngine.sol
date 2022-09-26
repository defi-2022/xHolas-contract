// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IEngine {
    function batchExec(address[] calldata tos, bytes32[] calldata configs, bytes[] memory datas, uint256[] calldata ruleIndexes) external payable;
    function execs(address[] calldata tos, bytes32[] calldata configs, bytes[] memory datas) external payable;
}
