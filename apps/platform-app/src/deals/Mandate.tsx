/**
 * Deal mandate — `/m/:handle`. Displays the deal details and provides
 * an interface to originate a prefilled Documenso document for signature.
 * Once originated, displays the signing link.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { type DealOriginatedResponse, originateDeal } from "@/lib/api";
import { Box, Button, Card, Page, Stack, Text } from "@rare-structure-hq/ui";

export default function Mandate() {
  const { handle } = useParams<{ handle: string }>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DealOriginatedResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleOriginate = async () => {
    if (!handle) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await originateDeal(handle);
      setResult(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "originate failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page variant="wide">
      <Stack gap="6">
        <Text as="h1" variant="heading-lg">
          Deal Mandate
        </Text>

        <Card>
          <Stack gap="4">
            <Box>
              <Text as="h2" variant="heading-sm">
                Deal: {handle}
              </Text>
            </Box>

            {err && (
              <Box style={{ padding: "12px", backgroundColor: "#fee", borderRadius: "4px" }}>
                <Text variant="body-sm" style={{ color: "#c33" }}>
                  {err}
                </Text>
              </Box>
            )}

            {result ? (
              <Stack gap="3">
                <Box>
                  <Text variant="body-sm" style={{ color: "#666" }}>
                    Document Status
                  </Text>
                  <Text variant="body-md">{result.status}</Text>
                </Box>

                <Box>
                  <Text variant="body-sm" style={{ color: "#666" }}>
                    Document ID
                  </Text>
                  <Text variant="body-md">{result.documentId}</Text>
                </Box>

                <Box>
                  <Text variant="body-sm" style={{ color: "#666" }}>
                    Envelope ID
                  </Text>
                  <Text variant="body-md">{result.envelopeId}</Text>
                </Box>

                <Box>
                  <Text variant="body-sm" style={{ color: "#666" }}>
                    Signing Link
                  </Text>
                  <a href={result.signLink} target="_blank" rel="noopener noreferrer">
                    <Button>Open Signing Link</Button>
                  </a>
                </Box>
              </Stack>
            ) : (
              <Button onClick={handleOriginate} disabled={loading}>
                {loading ? "Originating..." : "Originate Document"}
              </Button>
            )}
          </Stack>
        </Card>
      </Stack>
    </Page>
  );
}
