// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentNFT
 * @dev An ERC721 token where each NFT represents ownership of an autonomous yield agent.
 * The owner of this contract (the AgentFactory) has the exclusive right to mint new agents.
 */
contract AgentNFT is ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;

    constructor(address initialOwner)
        ERC721("Autonomous Yield Agent", "AGENT")
        Ownable(initialOwner)
    {}

    /**
     * @dev Mints a new agent NFT and assigns it to `to`.
     * Can only be called by the owner (the AgentFactory).
     * @param to The address to receive the newly minted NFT.
     * @return The ID of the newly minted token.
     */
    function safeMint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }
}
