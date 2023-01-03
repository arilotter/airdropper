import { useEffect, useState } from "react";
import {
  Text,
  Select,
  Box,
  TextInput,
  Button,
  ThemeProvider,
  NetworkIcon,
  vars,
} from "@0xsequence/design-system";
import {
  Page,
  SequenceIndexerClient,
  SequenceIndexerServices,
  TokenBalance,
} from "@0xsequence/indexer";
import {
  ContractInfo,
  SequenceMetadataClient,
  TokenMetadata,
} from "@0xsequence/metadata";
import { ChainId } from "@0xsequence/network";

type ContractData =
  | { state: "empty" }
  | { state: "fetching" }
  | {
      state: "ok";
      balances: TokenBalance[];
      contractInfo: ContractInfo;
      tokenInfo?: TokenMetadata;
    }
  | { state: "error"; error: string };

export function App() {
  const [network, setNetwork] = useState<keyof typeof indexers>(
    ChainId.POLYGON
  );
  const [contract, setContract] = useState<{
    address: string;
    tokenID?: string;
  }>({ address: "" });

  const [contractData, setContractItems] = useState<ContractData>({
    state: "empty",
  });

  useEffect(() => {
    if (!contract?.address) {
      setContractItems({ state: "empty" });
      return;
    }

    setContractItems({ state: "fetching" });

    const metaClient = new SequenceMetadataClient();
    const indexerClient = new SequenceIndexerClient(indexers[network]);

    let cancelled = false;
    (async () => {
      try {
        const getContractInfo = metaClient
          .getContractInfo({
            chainID: `${network}`,
            contractAddress: contract.address,
          })
          .then((m) => m.contractInfo);

        const getTokenInfo = contract.tokenID
          ? metaClient
              .getTokenMetadata({
                tokenIDs: [contract.tokenID],
                chainID: `${network}`,
                contractAddress: contract.address,
              })
              .then((m) => m.tokenMetadata[0])
          : undefined;

        const getBalances = fetchMultiplePages(
          (page) =>
            indexerClient.getTokenBalances({
              contractAddress: contract.address,
              accountAddress: "0x831dE831A64405aF965C67d6E0De2F9876fa2d99",
              page: {
                page,
              },
            }),
          "balances"
        );

        const [contractInfo, balances, tokenInfo] = await Promise.all([
          getContractInfo,
          getBalances,
          getTokenInfo,
        ]);

        const filteredBalances = balances.filter(
          (b) => !contract.tokenID || b.tokenID === contract.tokenID
        );

        if (!cancelled) {
          setContractItems({
            state: "ok",
            balances: filteredBalances,
            contractInfo,
            tokenInfo,
          });
        }
      } catch (err) {
        const error =
          typeof err === "object" &&
          err &&
          "error" in err &&
          typeof err.error === "string"
            ? err.error
            : JSON.stringify(err);
        if (!cancelled) {
          setContractItems({ state: "error", error });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contract, network]);

  return (
    <ThemeProvider>
      <Box width="vw" height="vh" padding="8">
        <Text variant="xlarge">
          📸 Download a CSV snapshot of any token's holders 😊
        </Text>

        <Box padding="8" gap="10">
          <Box
            style={{
              width: "160px",
            }}
          >
            <Select
              labelLocation="top"
              name="chainSelect"
              label="Select a chain"
              options={supportedChains.map(({ name, id }) => ({
                label: name,
                value: `${id}`,
              }))}
              defaultValue={`${ChainId.POLYGON}`}
              onValueChange={(v) =>
                setNetwork(Number.parseInt(v) as SupportedChainID)
              }
              value={`${network}`}
            />
          </Box>
          <Box width="full">
            <TextInput
              width="full"
              labelLocation="top"
              name="addressPicker"
              label="Enter any contract address"
              description={
                "error" in contractData ? contractData.error : undefined
              }
              onChange={(el) => {
                setContract({
                  address:
                    !el.target.value || el.target.value.trim().startsWith("0x")
                      ? el.target.value.trim()
                      : `0x${el.target.value.trim()}`,
                });
              }}
            />
          </Box>
        </Box>

        {(contract.tokenID ||
          (contractData.state === "ok" &&
            contractData.contractInfo.type === "ERC1155")) && (
          <Box width="full" padding={"8"}>
            <TextInput
              width="full"
              labelLocation="top"
              name="addressPicker"
              label="Optionally, enter a specific token ID"
              description={""}
              onChange={(el) =>
                setContract({
                  address: contract.address,
                  tokenID: el.target.value.trim(),
                })
              }
              value={contract.tokenID ?? ""}
            />
          </Box>
        )}

        {contractData.state === "ok" && (
          <Box padding={"8"} flexDirection="column" gap="8">
            <Text>
              <Text color="info">
                {contractData.contractInfo.type || "Unknown ERC token type"}
              </Text>{" "}
              contract{" "}
              <Text color="positive">
                {contractData.contractInfo.name ||
                  contractData.contractInfo.address}
              </Text>{" "}
              on{" "}
              <Text
                style={{
                  color: supportedChains.find((c) => c.id === network)?.color
                    .light,
                }}
              >
                {supportedChains.find((c) => c.id === network)?.name}
              </Text>{" "}
              has {contractData.balances.length} unique holder
              {contractData.balances.length === 1 ? "" : "s"}
              {contract.tokenID ? (
                <>
                  {" "}
                  of token{" "}
                  <Text color="positive">
                    {contractData.tokenInfo?.name || contract.tokenID}
                  </Text>
                </>
              ) : (
                ""
              )}
              .
            </Text>
            <Button
              label="Download CSV"
              variant="primary"
              disabled={contractData.balances.length === 0}
              onClick={() => {
                const csvText = `address,balance\n${contractData.balances
                  .map((b) => `${b.accountAddress},${b.balance}`)
                  .join("\n")}`;
                const csv = new Blob([csvText], {
                  type: "text/csv;charset=utf-8",
                });
                const url = URL.createObjectURL(csv);
                const link = document.createElement("a");
                link.href = url;
                link.click();
              }}
            ></Button>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}

const supportedChains = [
  { name: "Ethereum", id: ChainId.MAINNET, color: vars.networkColors.Ethereum },
  { name: "Polygon", id: ChainId.POLYGON, color: vars.networkColors.Polygon },
  { name: "BSC", id: ChainId.BSC, color: vars.networkColors.BSC },
  {
    name: "Optimism",
    id: ChainId.OPTIMISM,
    color: vars.networkColors.Ethereum,
  },
  {
    name: "Arbitrum",
    id: ChainId.ARBITRUM,
    color: vars.networkColors.Arbitrum,
  },
  {
    name: "Arbitrum Nova",
    id: ChainId.ARBITRUM_NOVA,
    color: vars.networkColors.Arbitrum,
  },
  {
    name: "Avalanche",
    id: ChainId.AVALANCHE,
    color: vars.networkColors.Avalance,
  },
  { name: "Gnosis", id: ChainId.GNOSIS, color: vars.networkColors.Gnosis },
] as const satisfies ReadonlyArray<{
  name: string;
  id: ChainId;
  color: { dark: string; light: string };
}>;

type SupportedChainID = typeof supportedChains[number]["id"];

const indexers: {
  [K in SupportedChainID]: SequenceIndexerServices;
} = {
  [ChainId.MAINNET]: SequenceIndexerServices.MAINNET,
  [ChainId.POLYGON]: SequenceIndexerServices.POLYGON,
  [ChainId.BSC]: SequenceIndexerServices.BSC,
  [ChainId.OPTIMISM]: SequenceIndexerServices.OPTIMISM,
  [ChainId.ARBITRUM]: SequenceIndexerServices.ARBITRUM,
  [ChainId.ARBITRUM_NOVA]: SequenceIndexerServices.ARBITRUM_NOVA,
  [ChainId.AVALANCHE]: SequenceIndexerServices.AVALANCHE,
  [ChainId.GNOSIS]: SequenceIndexerServices.GNOSIS,
};

async function fetchMultiplePages<T, K extends string>(
  func: (pageNum: number) => Promise<{ page: Page } & { [_ in K]: T[] }>,
  key: K,
  maxPages = Infinity
) {
  let nextPage = 0;
  const allItems: T[] = [];
  while (nextPage != -1 && nextPage < maxPages) {
    const res = await func(nextPage);
    allItems.push(...res[key]);

    if (res.page.more && res.page.page) {
      nextPage = res.page.page;
    } else {
      nextPage = -1;
    }
  }
  return allItems;
}
