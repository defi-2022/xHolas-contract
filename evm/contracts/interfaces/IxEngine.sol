pragma solidity ^0.8.10;

import { BridgeStructs } from '../Wormhole/BridgeStructs.sol';

interface IxEngine {
    function batchExec(
        address[] calldata tos,
        bytes32[] calldata configs,
        bytes[] memory datas
    ) external payable;

    function execs(
        address[] calldata tos,
        bytes32[] calldata configs,
        bytes[] memory datas
    ) external payable;
}
