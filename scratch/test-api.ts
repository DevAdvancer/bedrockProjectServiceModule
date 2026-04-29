async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/service-maps");
    const data = await res.json();
    const map = data.maps?.find((m: any) => m.baseServiceName === "ALC: Cold Brew");
    console.log("FROM API - status:", map?.status, "groceryYN:", map?.groceryYN);
  } catch (err: any) {
    console.error("Server not running or error:", err.message);
  }
}
run();
