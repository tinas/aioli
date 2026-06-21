<script setup lang="ts">
import { parseAsIndex, useLocalStorage, createStorage } from '@aioli/vue'

const ahmetStorageClient = createStorage({
  storage: 'local',
  prefix: 'ahmet:',
})

const pageIndex = useLocalStorage({
  key: 'pageIndex',
  parser: parseAsIndex.default(0),
  storage: ahmetStorageClient,
})

const searchText = useLocalStorage({
  key: 'searchText',
})
</script>

<template>
  <div>
    <h4>{{ pageIndex }}</h4>
    <button @click="pageIndex++">+</button>
    <button @click="pageIndex--">-</button>
    <hr />
    <input v-model="searchText" placeholder="Search..." />
  </div>
</template>

<style scoped></style>
