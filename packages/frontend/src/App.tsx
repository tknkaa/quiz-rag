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
		const quiz = await res.text();
		alert(quiz);
	};

	return (
		<div>
			<form onSubmit={handleSubmit}>
				<input value={theme} onChange={(e) => setTheme(e.target.value)} />
				<button type="submit">generate quiz!</button>
			</form>
		</div>
	);
}
