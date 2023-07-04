
import "./system_instruction.sol";

@program_id("F1ipperKF9EfD821ZbbYjS319LXYiBmjhzkkf5a26rC")
contract transfer_sol {

    @payer(payer) // payer to create new data account
    constructor(address payer) {
        // Creating a new data account is required by Solang even though it is not used in other instructions
        // No data is stored in the account in this example
    }

    // Transfer SOL from one account to another using CPI (Cross Program Invocation) to the System program
    function transferSolWithCpi(address from, address to, uint64 lamports) public view {
        // CPI to transfer SOL using "system_instruction" library
        SystemInstruction.transfer(from, to, lamports);
    }
}
