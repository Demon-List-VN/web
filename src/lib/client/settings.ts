import { writable } from "svelte/store"
import { browser } from "$app/environment"

function get(key: string, defaultValue: string) {
    return browser && localStorage.getItem(`settings.${key}`) || defaultValue
}

const settingsValue = {
}

class Settings {
    value = writable(settingsValue)

    set(key: string, val: string) {
        localStorage.setItem('settings.'+ key, val);
        // @ts-expect-error
        settingsValue[key] = val
        this.value.set(settingsValue)
    }
}

export const settings = new Settings()