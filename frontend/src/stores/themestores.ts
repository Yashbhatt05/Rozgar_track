import { makeAutoObservable } from "mobx";

class ThemeStore {
    theme: string = "dark"; // Start with dark mode

    constructor() {
        makeAutoObservable(this);
    }

    setDark() {
        this.theme = "dark";
    }

    setLight() {
        this.theme = "light";
    }

    toggle() {
        this.theme = this.theme === "dark" ? "light" : "dark";
    }
}

export const themeStore = new ThemeStore();