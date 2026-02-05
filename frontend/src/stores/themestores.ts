import { makeAutoObservable } from "mobx";

class ThemeStore {
    theme: string = "retro"

    constructor() {
      makeAutoObservable(this)
    }

    setTheme(theme: string) {
        this.theme = theme
    }
}

export const themeStore = new ThemeStore()
