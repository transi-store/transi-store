import { useColorMode } from "~/components/ui/color-mode";

export default function ApiDocPage() {
  const { colorMode } = useColorMode();

  return (
    <iframe
      src={`/api/doc/viewer?theme=${colorMode}`}
      style={{
        width: "100%",
        height: "calc(100vh - 73px)",
        border: "none",
        display: "block",
      }}
      title="Transi-Store API Reference"
    />
  );
}
