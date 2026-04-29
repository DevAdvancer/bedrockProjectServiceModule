async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/service-maps");
    const data = await res.json();
    const map = data.maps.find((m: any) => m.baseServiceName === "ALC: Infused Water");
    console.log("Grocery Needs:", map.groceryNeeds);
    console.log("Status:", map.status);
  } catch (err) {
    console.log("Server not running or error:", err);
  }
}
run();
