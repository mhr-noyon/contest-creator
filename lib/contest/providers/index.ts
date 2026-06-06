import { atcoderProvider } from "@/lib/contest/providers/atcoder";
import { codeforcesProvider } from "@/lib/contest/providers/codeforces";
import { OJName } from "@/lib/contest/types";
import { OJProviderInterface } from "@/lib/contest/providers/types";

const PROVIDERS: Record<OJName, OJProviderInterface> = {
  codeforces: codeforcesProvider,
  atcoder: atcoderProvider
};

export function getProvider(oj: OJName): OJProviderInterface {
  return PROVIDERS[oj];
}

export function listProviders(): OJProviderInterface[] {
  return Object.values(PROVIDERS);
}
