import { Button } from "@chakra-ui/react";
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "@/contexts/ProgramContextProvider";
// import { program } from "@/utils/anchorSetup"

// `.view()` seems to require a connected wallet to be used to set up AnchorProvider
// Otherwise, it throws: TypeError: Cannot read properties of undefined (reading 'logs')
// It also seems to require prompting the wallet to sign a transaction (even though it's a read-only operation)
export default function ViewButton() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { program } = useProgram();

  const onClick = async () => {
    if (!publicKey || !program) return;

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("seed"), publicKey.toBuffer()],
      program.programId
    );

    // Build the instruction
    const ix = await program.methods
      .get()
      .accounts({ dataAccount: pda })
      .instruction();

    const data = await connection.getLatestBlockhash();

    // Build a versioned transaction with the instruction
    const msg = new TransactionMessage({
      payerKey: publicKey,
      recentBlockhash: data.blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const tx = new VersionedTransaction(msg);

    // Simulate the transaction.
    const transactionSimulation = await connection.simulateTransaction(tx);
    console.log(transactionSimulation);

    // If the return data is available, log the first element.
    // If value is "0", then return data returns null
    if (transactionSimulation.value.returnData?.data) {
      console.log(transactionSimulation.value.returnData.data[0]);
    }

    // Log all the transaction logs.
    const transactionLogs = transactionSimulation.value.logs;
    console.log(transactionLogs);

    // As workaround to avoid null return data when value is "0"
    // Extract the program return data directly from the logs.
    // Finds log entry that starts with "Program return:"
    const returnPrefix = `Program return: ${program.programId} `;
    const returnLogEntry = transactionLogs!.find((log) =>
      log.startsWith(returnPrefix)
    );
    console.log(returnLogEntry);

    if (returnLogEntry) {
      // Slice out the prefix to get the base64 return data
      const encodedReturnData = returnLogEntry.slice(returnPrefix.length);
      console.log(encodedReturnData);

      // Convert the Base64 return data to a buffer and alert the first byte (the bool value).
      const decodedBuffer = Buffer.from(encodedReturnData, "base64");
      alert(decodedBuffer[0]);
    }

    // const val = await program.methods
    //   .get()
    //   .accounts({ dataAccount: pda })
    //   .view()

    // // Can't use `fetch` because account type not in IDL
    // const val = await program.account.dataAccount.fetch(pda)
  };

  return <Button onClick={onClick}>View</Button>;
}
