<template>
  <a-modal
    :open="visible"
    @update:open="$emit('update:visible', $event)"
    :title="title"
    width="90%"
    :footer="null"
    centered
    class="screenshot-modal"
  >
    <div class="screenshot-viewer">
      <img
        v-if="url"
        :src="url"
        :alt="title"
        loading="lazy"
        decoding="async"
        class="screenshot-image"
      />
      <div v-else class="no-image">
        <a-empty description="暂无图片" />
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean
  title: string
  url: string
}

interface Emits {
  'update:visible': [visible: boolean]
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.screenshot-viewer {
  text-align: center;
  max-height: 80vh;
  overflow: auto;
}

.screenshot-image {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 4px;
}

.no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.screenshot-modal :deep(.ant-modal-body) {
  padding: 16px;
}
</style>