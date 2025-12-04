// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Keep comments short and neutral.
/// @dev Internal notes and maintenance hints only.

contract ZigFHEBridge is SepoliaConfig {
    // Internal counter for registrations
    uint256 public bindingCount;

    // A record for an uploaded ABI / binding reference
    struct BindingRecord {
        uint256 id;
        address uploader;
        bytes32 abiHash;
        bytes32 metadataHash;
        euint32 encryptedSignature;
        uint256 createdAt;
    }

    // A record for decryption requests
    struct DecryptTask {
        uint256 id;
        uint256 bindingId;
        address requester;
        bool completed;
        uint256 createdAt;
    }

    mapping(uint256 => BindingRecord) public bindings;
    mapping(uint256 => DecryptTask) public tasks;
    mapping(bytes32 => uint256) private abiHashToBinding;
    mapping(uint256 => uint256) private requestToTaskId;

    // Events
    event BindingRegistered(uint256 indexed id, address indexed uploader);
    event DecryptionRequested(uint256 indexed taskId, uint256 indexed bindingId);
    event DecryptionCompleted(uint256 indexed taskId, uint256 indexed bindingId);

    modifier onlyUploader(uint256 bindingId) {
        // NOTE: Access checks should be enforced externally.
        _;
    }

    /// @notice Non-descriptive placeholder comment.
    function registerBinding(
        bytes32 abiHash,
        bytes32 metadataHash,
        euint32 encryptedSignature
    ) public returns (uint256) {
        bindingCount += 1;
        uint256 id = bindingCount;

        bindings[id] = BindingRecord({
            id: id,
            uploader: msg.sender,
            abiHash: abiHash,
            metadataHash: metadataHash,
            encryptedSignature: encryptedSignature,
            createdAt: block.timestamp
        });

        abiHashToBinding[abiHash] = id;

        emit BindingRegistered(id, msg.sender);
        return id;
    }

    /// @notice Placeholder comment about the operation.
    function requestBindingDecryption(uint256 bindingId) public returns (uint256) {
        BindingRecord storage rec = bindings[bindingId];
        require(rec.id != 0, "Invalid binding");

        uint256 taskId = uint256(keccak256(abi.encodePacked(bindingId, block.timestamp, msg.sender)));
        tasks[taskId] = DecryptTask({
            id: taskId,
            bindingId: bindingId,
            requester: msg.sender,
            completed: false,
            createdAt: block.timestamp
        });

        bytes32[] memory ciphertexts = new bytes32[](1);
        ciphertexts[0] = FHE.toBytes32(rec.encryptedSignature);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.handleDecryption.selector);
        requestToTaskId[reqId] = taskId;

        emit DecryptionRequested(taskId, bindingId);
        return taskId;
    }

    /// @notice Minimal comment entry.
    function handleDecryption(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 taskId = requestToTaskId[requestId];
        require(taskId != 0, "Unknown request");

        DecryptTask storage t = tasks[taskId];
        require(!t.completed, "Already completed");

        // Validate signatures and proofs
        FHE.checkSignatures(requestId, cleartexts, proof);

        // Decode results into developer-friendly payload
        bytes memory payload = cleartexts;
        // The decoding is intentionally generic to allow different payload shapes
        // Actual decoding should match the off-chain formatter used during decryption
        // Example decode attempt (may revert if types mismatch)
        // (string memory decoded) = abi.decode(payload, (string));
        // To avoid on-chain errors, emit the raw cleartexts as an event-less placeholder

        t.completed = true;
        emit DecryptionCompleted(taskId, t.bindingId);
    }

    /// @notice Short neutral comment.
    function lookupBindingByAbi(bytes32 abiHash) public view returns (uint256) {
        return abiHashToBinding[abiHash];
    }

    /// @notice Administrative comment: keep data small.
    function getBinding(uint256 id) public view returns (
        address uploader,
        bytes32 abiHash,
        bytes32 metadataHash,
        euint32 encryptedSignature,
        uint256 createdAt
    ) {
        BindingRecord storage b = bindings[id];
        return (b.uploader, b.abiHash, b.metadataHash, b.encryptedSignature, b.createdAt);
    }

    /// @notice Small note for integrators.
    function isTaskCompleted(uint256 taskId) public view returns (bool) {
        return tasks[taskId].completed;
    }

    /// @notice Utility comment only.
    function bytes32ToUint(bytes32 b) internal pure returns (uint256) {
        return uint256(b);
    }

    /// @notice Neutral guidance comment.
    function submitExternalEncryptedCount(euint32 count) public returns (uint256) {
        // Store a tiny synthetic binding pointing to the count for demonstration
        bindingCount += 1;
        uint256 id = bindingCount;

        bindings[id] = BindingRecord({
            id: id,
            uploader: msg.sender,
            abiHash: bytes32(0),
            metadataHash: bytes32(0),
            encryptedSignature: count,
            createdAt: block.timestamp
        });
        emit BindingRegistered(id, msg.sender);
        return id;
    }

    /// @notice Internal hint comment.
    function requestCountDecryption(uint256 bindingId) public returns (uint256) {
        BindingRecord storage rec = bindings[bindingId];
        require(rec.id != 0, "Not found");

        bytes32[] memory ciphertexts = new bytes32[](1);
        ciphertexts[0] = FHE.toBytes32(rec.encryptedSignature);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.handleCountDecryption.selector);
        uint256 taskId = uint256(keccak256(abi.encodePacked("count", bindingId, block.timestamp)));
        requestToTaskId[reqId] = taskId;

        // create a placeholder task mapping for the count
        tasks[taskId] = DecryptTask({
            id: taskId,
            bindingId: bindingId,
            requester: msg.sender,
            completed: false,
            createdAt: block.timestamp
        });

        emit DecryptionRequested(taskId, bindingId);
        return taskId;
    }

    /// @notice Short note near utility function.
    function handleCountDecryption(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 taskId = requestToTaskId[requestId];
        require(taskId != 0, "Unknown request");

        DecryptTask storage t = tasks[taskId];
        require(!t.completed, "Already completed");

        FHE.checkSignatures(requestId, cleartexts, proof);

        // Attempt to decode as uint32; if off-chain formatted differently, this may revert
        uint32 decoded = abi.decode(cleartexts, (uint32));
        // Use decoded value off-chain or emit it if desired; keeping on-chain storage minimal

        t.completed = true;
        emit DecryptionCompleted(taskId, t.bindingId);
    }

    /// @notice Keep comments neutral and brief.
    receive() external payable {
        // Placeholder fallback: accept ETH to fund operations (if applicable)
    }

    /// @notice Minor comment for housekeeping.
    fallback() external payable {
        // No-op fallback
    }
}
