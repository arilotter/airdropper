import { useEffect, useState } from "react";
import {
  Text,
  Select,
  Box,
  TextInput,
  Button,
  ThemeProvider,
} from "@0xsequence/design-system";
import {
  Page,
  SequenceIndexerClient,
  SequenceIndexerServices,
  TokenBalance,
} from "@0xsequence/indexer";
import { ChainId } from "@0xsequence/network";

type Data = { empty: true } | { ok: TokenBalance[] } | { error: string };

export function App() {
  const [network, setNetwork] = useState<keyof typeof indexers>(
    ChainId.POLYGON
  );
  const [contractAddress, setContractAddress] = useState<string>();

  const [contractItems, setContractItems] = useState<Data>({ empty: true });

  useEffect(() => {
    (async () => {
      if (!contractAddress) {
        setContractItems({ empty: true });
        return;
      }
      const indexer = new SequenceIndexerClient(indexers[network]);
      try {
        const items = await fetchMultiplePages(async (page) => {
          const res = await indexer.getTokenBalances({
            contractAddress: contractAddress,
            accountAddress: "0x831dE831A64405aF965C67d6E0De2F9876fa2d99",
            page: {
              page,
            },
          });
          return { page: res.page, items: res.balances };
        });
        setContractItems({ ok: items });
      } catch (err) {
        if (
          typeof err === "object" &&
          err &&
          "error" in err &&
          typeof err.error === "string"
        ) {
          setContractItems({ error: err.error });
        } else {
          setContractItems({ error: JSON.stringify(err) });
        }
        console.log(err);
      }
    })();
  }, [contractAddress, network]);
  return (
    <ThemeProvider>
      <Box
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        width="vw"
        height="vh"
      >
        <Text variant="xlarge">
          🪄 Download a CSV snapshot of any token's holders 😊
        </Text>
        <Box padding={"16"}>
          <Select
            labelLocation="top"
            name="chainSelect"
            label="Select a chain"
            options={[
              { label: "Mainnet", value: "1" },
              { label: "Polygon", value: "137" },
              { label: "BSC", value: "56" },
              { label: "Optimism", value: "10" },
              { label: "Arbitrum", value: "42161" },
              { label: "Arbitrum Nova", value: "42170" },
              { label: "Avalanche", value: "43114" },
              { label: "Gnosis", value: "100" },
            ]}
            defaultValue="137"
            onValueChange={(v) => {
              setNetwork(Number.parseInt(v) as keyof typeof indexers);
            }}
            value={`${network}`}
          />
        </Box>
        <TextInput
          labelLocation="top"
          name="addressPicker"
          label="Enter an ERC20, 721, or 1155 contract ID"
          description={
            "error" in contractItems ? contractItems.error : undefined
          }
          onChange={(el) => setContractAddress(el.target.value)}
        ></TextInput>
        {"ok" in contractItems && (
          <Box padding={"8"}>
            <Text>{contractItems.ok.length} holders </Text>
            <Button
              label="Download CSV"
              onClick={() => {
                console.log(contractItems.ok);
              }}
            ></Button>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}

const indexers = {
  1: SequenceIndexerServices.MAINNET,
  137: SequenceIndexerServices.POLYGON,
  56: SequenceIndexerServices.BSC,
  10: SequenceIndexerServices.OPTIMISM,
  42161: SequenceIndexerServices.ARBITRUM,
  42170: SequenceIndexerServices.ARBITRUM_NOVA,
  43114: SequenceIndexerServices.AVALANCHE,
  100: SequenceIndexerServices.GNOSIS,
};

async function fetchMultiplePages<T>(
  func: (pageNum: number) => Promise<{ page: Page; items: T[] }>,
  maxPages = Infinity
) {
  let nextPage = 0;
  const allItems: T[] = [];
  while (nextPage != -1 && nextPage < maxPages) {
    const { page, items } = await func(nextPage);
    allItems.push(...items);

    if (page.more && page.page) {
      nextPage = page.page;
    } else {
      nextPage = -1;
    }
    // todo add rate limit
  }
  return allItems;
}
