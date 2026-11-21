import { render } from "preact";
import { App } from "./App";
import "../index.css";
import { followThemePreference } from "../shared/theme-preference";

followThemePreference();
render(<App />, document.getElementById("app") as HTMLElement);
