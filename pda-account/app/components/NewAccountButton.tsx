import { Button } from "@chakra-ui/react"
import { PublicKey } from "@solana/web3.js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useProgram } from "@/contexts/ProgramContextProvider"
// import { program } from "@/utils/anchorSetup"

// Invoke "new" instruction on program, to create a new account
// This should fail if the account already exists, but it still re-initializes the account data to default values
export default function NewAccountButton() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { program } = useProgram()

  const onClick = async () => {
    if (!publicKey || !program) return

    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("seed"), publicKey.toBuffer()],
      program.programId
    )

    const transaction = await program.methods
      .new(publicKey, Buffer.from([bump]))
      .accounts({ dataAccount: pda, wallet: publicKey })
      .transaction()

    const txSig = await sendTransaction(transaction, connection)
    console.log(`https://explorer.solana.com/tx/${txSig}?cluster=devnet`)
  }

  return <Button onClick={onClick}>New Account</Button>
}
