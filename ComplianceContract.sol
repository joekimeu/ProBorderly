// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ComplianceContract {
    address public client;
    address public serviceProvider;
    address public escrow;
    uint public amount;
    bool public serviceCompleted;
    bool public disputeRaised;

    constructor(address _client, address _serviceProvider, address _escrow, uint _amount) {
        client = _client;
        serviceProvider = _serviceProvider;
        escrow = _escrow;
        amount = _amount;
        serviceCompleted = false;
        disputeRaised = false;
    }

    modifier onlyClient() {
        require(msg.sender == client, "Only client can call this");
        _;
    }

    modifier onlyServiceProvider() {
        require(msg.sender == serviceProvider, "Only service provider can call this");
        _;
    }

    function markServiceCompleted() public onlyServiceProvider {
        serviceCompleted = true;
    }

    function raiseDispute() public onlyClient {
        disputeRaised = true;
    }

    function releasePayment() public onlyClient {
        require(serviceCompleted, "Service not completed");
        require(!disputeRaised, "Dispute raised");
        payable(serviceProvider).transfer(amount);
    }

    receive() external payable {}
}
