<script setup lang="ts">
defineProps<{ href: string }>()
</script>

<template>
  <a class="google-account-link" :href="href">
    <img src="/google-g.png" alt="" width="20" height="20" />
    <span><slot /></span>
  </a>
</template>

<style scoped>
/* Google Identity branding: https://developers.google.com/identity/branding-guidelines */
.google-account-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 44px;
  margin: 16px 0;
  padding: 10px 12px;
  border: 1px solid #747775;
  border-radius: 4px;
  color: #1f1f1f;
  background: #fff;
  font:
    500 14px/20px Arial,
    sans-serif;
  text-decoration: none;
}
.google-account-link img {
  flex: none;
  object-fit: contain;
}
.google-account-link:hover {
  background: #f2f2f2;
}
.google-account-link:focus-visible {
  outline: 3px solid #4285f4;
  outline-offset: 3px;
}
</style>
