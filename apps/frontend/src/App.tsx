import { client } from "./utils/client";

export default function App() {
  const handleClick = async () => {
    const res = await client.index.$get();
    const data = await res.text();
    alert(data);
  };
  return (
    <div>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
}
