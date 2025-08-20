import re

# Read the file
with open('MainLayout.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old onMounted function
old_pattern = r'onMounted\(\(\) => \{[\s\S]*?^\}\)'

# Define the new onMounted function
new_content = '''onMounted(() => {
  // 只有在用户信息不存在且token存在时才获取用户信息
  const token = localStorage.getItem('token')
  console.log('MainLayout mounted - token存在:', !!token)
  console.log('MainLayout mounted - authStore.isAuthenticated:', authStore.isAuthenticated)
  console.log('MainLayout mounted - authStore.user:', authStore.user)
  
  if (token && !authStore.user) {
    console.log('Token存在但用户信息不存在，获取用户信息')
    authStore.fetchProfile().catch(() => {
      // 如果获取用户信息失败，token可能已过期，清除认证状态
      console.log('获取用户信息失败，可能token已过期')
    })
  } else if (token && authStore.user) {
    console.log('Token和用户信息都存在，跳过获取用户信息')
  } else {
    console.log('Token不存在，跳过获取用户信息')
  }
  
  selectedKeys.value = [route.path]
})'''

# Replace the content
content = re.sub(old_pattern, new_content, content, flags=re.MULTILINE)

# Write back to file
with open('MainLayout.vue', 'w', encoding='utf-8') as f:
    f.write(content)

print('MainLayout.vue has been updated successfully')
