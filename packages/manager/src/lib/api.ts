export type JettonData = {
  totalSupply: string;
  mintable: boolean;
  adminAddress: string;
  metadata: {
    persistenceType: string;
    metadata: {
      name: string;
      symbol: string;
      decimals: string;
    };
    isJettonDeployerFaultyOnChainData: boolean;
  };
};

export async function getJettonData(
  contractAddress: string,
): Promise<JettonData> {
  const res = await fetch(
    import.meta.env.VITE_API_URL + "/jetton/" + contractAddress,
  );

  if (!res.ok) {
    // TODO: Handle errors gracefully (user may enter invalid contract address).
    throw new Error(await res.text());
  }

  return res.json();
}
