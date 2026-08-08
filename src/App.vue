<template>
  <div id="app">
    <router-view />
    <TabBar />
    <UpdateToast />
    <VConsoleButton />
  </div>
</template>

<script setup lang="ts">
import TabBar from './components/TabBar.vue';
import UpdateToast from './components/UpdateToast.vue';
import VConsoleButton from './components/VConsoleButton.vue';
</script>
