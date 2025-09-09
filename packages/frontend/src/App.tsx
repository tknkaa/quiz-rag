import { useState, type FormEvent } from "react";
import { client } from "./utils/client";

export default function App() {
	const [theme, setTheme] = useState("");
	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const res = await client.api.quiz.$post({
			form: {
				theme,
			},
		});
		const quiz = await res.json();
		console.log(quiz);
	};

	return (
		<div>
			<form onSubmit={handleSubmit}>
				<input value={theme} onChange={(e) => setTheme(e.target.value)} />
				<button type="submit">generate quiz</button>
			</form>
			<button
				onClick={async () => {
					const res = await client.index.$get();
					const text = await res.text();
					alert(text);
				}}
			>
				say hello
			</button>
		</div>
	);
}
