import { Button } from "@chakra-ui/react"
import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useProgram } from "@/contexts/ProgramContextProvider"
// import { program } from "@/utils/anchorSetup"

// `.view()` seems to require a connected wallet to be used to set up AnchorProvider
// Otherwise, it throws: TypeError: Cannot read properties of undefined (reading 'logs')
// It also seems to require prompting the wallet to sign a transaction (even though it's a read-only operation)
export default function ViewButton() {
  const { publicKey } = useWallet()
  const {connection} = useConnection()
  const { program } = useProgram()

  const onClick = async () => {
    if (!publicKey || !program) return

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("seed"), publicKey.toBuffer()],
      program.programId
    )

    const ix = await program.methods
      .get()
      .accounts({ dataAccount: pda })
      .instruction()

    const data = await connection.getLatestBlockhash()
    
    const msg = new TransactionMessage({
      payerKey: publicKey,
      recentBlockhash: data.blockhash,
      instructions: [ix]
    }).compileToV0Message();

    const tx = new VersionedTransaction(msg)

    const txSim = await connection.simulateTransaction(tx)
    const txSimLogs = txSim.value.logs
    
    console.log(txSim)
    // If value is "0", then returns undefined
    console.log(txSim.value.returnData?.data[0])
    // However, return value still shows in program logs
    console.log(txSim.value.logs)

    // Find the program log that starts with "Program return:"
    // Then slice out the prefix to get the return data
    const returnPrefix = `Program return: ${program.programId} `;
    const returnLog = txSimLogs!.find((log) =>
      log.startsWith(returnPrefix)
    );
    console.log(returnLog)
    const returnData = returnLog?.slice(returnPrefix.length);
    console.log(returnData)

    const buffer = Buffer.from(returnData!, 'base64')
    alert(buffer[0])


    // const val = await program.methods
    //   .get()
    //   .accounts({ dataAccount: pda })
    //   .view()

    // // Can't use `fetch` because account type not in IDL
    // const val = await program.account.dataAccount.fetch(pda)
  }

  return <Button onClick={onClick}>View</Button>
}
