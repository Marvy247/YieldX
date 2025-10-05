// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DemoUSD
 * @dev A simple ERC20 token used for demonstration purposes in the Somnia hackathon.
 * Includes a minting function restricted to the owner to easily create tokens for the demo.
 */
contract DemoUSD is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Demo USD", "DUSD") Ownable(initialOwner) {}

    /**
     * @dev Creates `amount` tokens and assigns them to `to`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - The caller must be the owner of the contract.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
