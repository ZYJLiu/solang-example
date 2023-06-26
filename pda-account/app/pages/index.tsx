import { Box, Flex, Spacer, VStack } from "@chakra-ui/react"
import WalletMultiButton from "@/components/WalletMultiButton"
import NewAccountButton from "@/components/NewAccountButton"
import FlipButton from "@/components/FlipButton"
import FetchState from "@/components/FetchState"
import ViewButton from "@/components/ViewButton"

export default function Home() {
  return (
    <Box>
      <Flex px={4} py={4}>
        <Spacer />
        <WalletMultiButton />
      </Flex>
      <VStack justifyContent="center">
        <NewAccountButton />
        <FlipButton />
        <ViewButton />
        <FetchState />
      </VStack>
    </Box>
  )
}
