import { useState } from "react";
import { client } from "./utils/client";

export default function App() {
	const [input, setInput] = useState("");
	const handleClick = async () => {
		const res = await client.index.$get();
		const data = await res.text();
		alert(data);
	};
	const handleSubmit = async () => {
		const res = await client.quiz.$post({
			form: {
				prompt: "what is class in JavaScript",
			},
		});
		const data = await res.json();
		if ("quiz" in data) {
			console.log(data.quiz);
		}
	};
	return (
		<div>
			<form onSubmit={handleSubmit}>
				<input value={input} onChange={(e) => setInput(e.target.value)} />
				<button type="submit">generate quiz</button>
			</form>
			<button onClick={handleClick}>Click me</button>
		</div>
	);
}
