<template>
  <div class="group-management">
    <div class="header">
      <h2>分组管理</h2>
      <a-space>
        <a-button type="primary" @click="openCreate">新增分组</a-button>
        <a-button @click="loadGroups" :loading="loading">
          <template #icon><reload-outlined /></template>
          刷新
        </a-button>
      </a-space>
    </div>

    <a-table :dataSource="groups" :columns="columns" row-key="id" :loading="loading">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'color'">
          <div :style="{ width: '16px', height: '16px', background: record.color || '#d9d9d9', borderRadius: '3px', border: '1px solid #ccc' }"></div>
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" @click="openEdit(record)">编辑</a-button>
            <a-popconfirm :title="record.isDefault ? '默认分组无法删除' : '确认删除该分组吗？删除后其中客户端将转移到默认分组'" :ok-button-props="{ disabled: record.isDefault }" @confirm="() => handleDelete(record)" :disabled="record.isDefault">
              <a-button type="link" danger :disabled="record.isDefault">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="modalOpen" :title="isEdit ? '编辑分组' : '新增分组'" @ok="handleOk" :confirm-loading="saving" @cancel="handleCancel">
      <a-form :model="form" layout="vertical">
        <a-form-item label="分组名称" required>
          <a-input v-model:value="form.name" placeholder="请输入名称" />
        </a-form-item>
        <a-form-item label="颜色">
          <a-input v-model:value="form.color" placeholder="#1890ff" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="form.description" :rows="3" placeholder="用于描述该分组的用途" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { clientsApi, type ClientGroup } from '@/api/clients'
import { ReloadOutlined } from '@ant-design/icons-vue'

const loading = ref(false)
const saving = ref(false)
const groups = ref<(ClientGroup & { isDefault?: boolean })[]>([])

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '颜色', dataIndex: 'color', key: 'color', width: 80 },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '操作', key: 'action', width: 160 }
]

const modalOpen = ref(false)
const isEdit = ref(false)
const form = reactive<Partial<ClientGroup>>({
  name: '',
  color: '#1890ff',
  description: ''
})

const DEFAULT_GROUP_NAME = '默认分组'

const loadGroups = async () => {
  loading.value = true
  try {
    const res = await clientsApi.getGroups()
    const list = Array.isArray(res) ? res : (res?.data || res)
    groups.value = (list || []).map((g:any) => ({
      ...g,
      isDefault: g.name === DEFAULT_GROUP_NAME
    }))
  } catch (e:any) {
    message.error(e?.message || '获取分组失败')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  isEdit.value = false
  Object.assign(form, { name: '', color: '#1890ff', description: '' })
  modalOpen.value = true
}

const openEdit = (record: ClientGroup) => {
  isEdit.value = true
  Object.assign(form, record)
  modalOpen.value = true
}

const handleOk = async () => {
  if (!form.name?.trim()) {
    message.warning('请输入分组名称')
    return
  }
  saving.value = true
  try {
    if (isEdit.value && form.id) {
      await clientsApi.updateGroup(form.id, { name: form.name, color: form.color, description: form.description })
      message.success('分组已更新')
    } else {
      await clientsApi.createGroup({ name: form.name, color: form.color, description: form.description })
      message.success('分组已创建')
    }
    modalOpen.value = false
    await loadGroups()
  } catch (e:any) {
    message.error(e?.response?.data?.message || e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  modalOpen.value = false
}

const handleDelete = async (record: ClientGroup & { isDefault?: boolean }) => {
  if (record.isDefault) return
  try {
    await clientsApi.deleteGroup(record.id)
    message.success('删除成功（该分组内的客户端将由后端转移到默认分组）')
    await loadGroups()
  } catch (e:any) {
    message.error(e?.response?.data?.message || e?.message || '删除失败')
  }
}

onMounted(() => {
  loadGroups()
})
</script>

<style scoped>
.group-management { padding: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>

