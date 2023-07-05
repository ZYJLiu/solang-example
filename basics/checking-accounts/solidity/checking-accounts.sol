
import "solana";

@program_id("F1ipperKF9EfD821ZbbYjS319LXYiBmjhzkkf5a26rC")
contract checking_accounts {

    @payer(payer)
    constructor(address payer) {}

    function checkAccounts(address accountToChange, address accountToCreate) public view {
        print("Number of Accounts Provided: {:}".format(tx.accounts.length));

        // Checks Accounts
        programOwnerCheck(accountToChange);
        notInitializedCheck(accountToCreate);
        signerCheck(accountToCreate);

        // (Create account...) (unimplemented)
        // (Change account...) (unimplemented)
    }

    function programOwnerCheck(address account) internal view {
        print("Progam Owner Check");
        for (uint64 i = 0; i < tx.accounts.length; i++) {
            AccountInfo ai = tx.accounts[i];

            if (ai.key == account) {
                print("Account Found: {:}".format(ai.key));
                // This program should be the owner of the account
                require(ai.owner == type(checking_accounts).program_id, "Account to change does not have the correct program id.");
            }
        }
    }

    function notInitializedCheck(address account) internal view {
        print("Check Account Not Initialized");
        for (uint64 i = 0; i < tx.accounts.length; i++) {
            AccountInfo ai = tx.accounts[i];

            if (ai.key == account) {
                print("Account Found: {:}".format(ai.key));
                // This account should not be initialized (has no lamports)
                require(ai.lamports == 0, "The program expected the account to create to not yet be initialized.");
            }
        }
    }

    function signerCheck(address account) internal view {
        print("Check Account Signed Transaction");
        for (uint64 i = 0; i < tx.accounts.length; i++) {
            AccountInfo ai = tx.accounts[i];

            if (ai.key == account) {
                print("Account Found: {:}".format(ai.key));
                // This account should be a signer on the transaction
                require(ai.is_signer, "Account required to be a signer");
            }
        }
    }
}
