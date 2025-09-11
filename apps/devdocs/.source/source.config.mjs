// source.config.ts
import { defineDocs, defineConfig } from "fumadocs-mdx/config"
var { docs, meta } = defineDocs({
  dir: "content",
})
var source_config_default = defineConfig({
  mdxOptions: {
    lastModifiedTime: "git",
  },
})
export { source_config_default as default, docs, meta }
