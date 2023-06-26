
@program_id("GwnWG8hjzBBnXRtQAmr3Cbo6ShYjv5s6NHTAdsmURXKa")
contract pda_account {
    bool private isInitialized;
    bool private value = true;

    @payer(payer) // payer address
    @seed("seed") // hardcoded seed
    @seed(abi.encode(payer)) // seed from payer address
    @bump(bump) // bump seed for pda address
    constructor(address payer, bytes bump) {
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        print("Hello, World!");
    }

    /// A message that can be called on instantiated contracts.
    /// This one flips the value of the stored `bool` from `true`
    /// to `false` and vice versa.
    function flip() public {
        value = !value;
    }

    /// Simply returns the current value of our `bool`.
    function get() public view returns (bool) {
        return value;
    }
}
