import { lazy, Suspense } from "react";
import { Spinner, Box } from "@chakra-ui/react";

const RedocStandalone = lazy(() =>
  import("redoc").then((m) => ({ default: m.RedocStandalone })),
);

export default function ApiDocPage() {
  return (
    <Box minH="80vh">
      <Suspense
        fallback={
          <Box display="flex" justifyContent="center" py="20">
            <Spinner size="xl" />
          </Box>
        }
      >
        <RedocStandalone
          specUrl="/api/doc.json"
          options={{
            scrollYOffset: 0,
            hideDownloadButton: false,
            nativeScrollbars: true,
          }}
        />
      </Suspense>
    </Box>
  );
}
