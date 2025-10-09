// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DemoUSD.sol";
import "../src/YieldPool.sol";

contract DepositToPool is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Replace with actual addresses
        address demoUsdAddress = 0xd078eb70856507EaaC7bf8d31c36733E2a386228;
        address poolAAddress = 0x4fEB2e0222a3704043fCEe6C335ce04E330ceC27;
        address poolBAddress = 0xCd051eFaE35c99159564A33ec421B346C7fB2976;

        DemoUSD demoUsd = DemoUSD(demoUsdAddress);
        YieldPool poolA = YieldPool(poolAAddress);
        YieldPool poolB = YieldPool(poolBAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Mint tokens to deployer
        demoUsd.mint(deployer, 10000 * 10**18);

        // Approve pool A
        demoUsd.approve(poolAAddress, 5000 * 10**18);

        // Deposit to pool A
        poolA.deposit(5000 * 10**18);

        // Approve pool B
        demoUsd.approve(poolBAddress, 5000 * 10**18);

        // Deposit to pool B
        poolB.deposit(5000 * 10**18);

        vm.stopBroadcast();

        console.log("Deposited 5000 DUSD to Pool A and 5000 DUSD to Pool B");
    }
}
