pragma solidity ^0.8.10;

import { BridgeStructs } from '../Wormhole/BridgeStructs.sol';

interface IxHolas {
    function updatePeerContract(uint16 peerChainId, bytes32 wormholeCompatAddress) external;

    function executeTransactionsEntryPoint(
        address[] memory tos,
        bytes32[] memory configs,
        uint16[] memory chainIds,
        bytes[] memory datas
    ) external payable;

    function executeTransactionsRelayPoint(bytes memory encodedVm) external;

//    function decodeVaaPayload(bytes memory payload) external pure returns (BridgeStructs.TransferWithPayload memory);
}
