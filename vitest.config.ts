import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        fileParallelism: false, // Ensures sequential execution so database state stays predictable
    },
})