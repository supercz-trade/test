import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function XCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (window.opener) {
      if (code && state) {
        window.opener.postMessage(
          { type: "x_auth_success", code, state },
          window.location.origin
        );
      } else {
        window.opener.postMessage(
          { type: "x_auth_error", error },
          window.location.origin
        );
      }
      window.close();
    }
  }, [searchParams]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "#0a0a0a",
      color: "#fff",
      fontFamily: "sans-serif"
    }}>
      <p>Processing X authentication...</p>
    </div>
  );
}