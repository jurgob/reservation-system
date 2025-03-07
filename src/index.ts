import { createApp } from "./app";


const PORT = 3000;
const onStart = () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}
createApp().then(app => app.listen(PORT, onStart))
