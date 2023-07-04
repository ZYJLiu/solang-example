

import "./system_instruction.sol";

@program_id("F1ipperKF9EfD821ZbbYjS319LXYiBmjhzkkf5a26rC")
contract rent {
    bool private value = true;

    @payer(payer)
    constructor(address payer) {}

    function createSystemAccount(address payer, address newAccount, uint64 lamports, uint64 space) public view {
        SystemInstruction.create_account(
            payer,        // lamports sent from this account (payer)
            newAccount, // lamports sent to this account (account to be created)
            lamports,      // lamport amount (minimum lamports required)
            space,          // space required for the account
            SystemInstruction.systemAddress // program owner (system program)
        );
    }

}
