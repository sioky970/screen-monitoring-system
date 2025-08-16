/**
 * 图片工具函数
 */

import { log } from './logger'

export interface PlaceholderOptions {
  width?: number
  height?: number
  text?: string
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  fontSize?: number
  showTimestamp?: boolean
  additionalInfo?: string
}

/**
 * 生成占位图片
 */
export function generatePlaceholderImage(options: PlaceholderOptions = {}): string {
  const {
    width = 800,
    height = 600,
    text = '屏幕截图',
    backgroundColor = '#f0f2f5',
    textColor = '#666666',
    borderColor = '#d9d9d9',
    fontSize = 24,
    showTimestamp = true,
    additionalInfo = ''
  } = options

  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      log.warn('ImageUtils', 'Cannot create canvas context')
      return generateSVGPlaceholder(options)
    }
    
    // 设置背景
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
    
    // 设置边框
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, width - 2, height - 2)
    
    // 绘制网格背景（可选）
    drawGrid(ctx, width, height, borderColor)
    
    // 设置主文字
    ctx.fillStyle = textColor
    ctx.font = `bold ${fontSize}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // 绘制主文字
    const centerY = height / 2
    ctx.fillText(text, width / 2, centerY - 30)
    
    // 绘制附加信息
    if (additionalInfo) {
      ctx.font = `${Math.floor(fontSize * 0.7)}px Arial, sans-serif`
      ctx.fillStyle = '#999999'
      ctx.fillText(additionalInfo, width / 2, centerY + 10)
    }
    
    // 绘制时间戳
    if (showTimestamp) {
      ctx.font = `${Math.floor(fontSize * 0.6)}px Arial, sans-serif`
      ctx.fillStyle = '#cccccc'
      const timeText = `更新时间: ${new Date().toLocaleTimeString()}`
      ctx.fillText(timeText, width / 2, centerY + 40)
    }
    
    // 绘制装饰性图标
    drawIcon(ctx, width / 2, centerY - 80, 40, textColor)
    
    return canvas.toDataURL('image/png')
  } catch (error) {
    log.error('ImageUtils', 'Error generating canvas placeholder', error)
    return generateSVGPlaceholder(options)
  }
}

/**
 * 绘制网格背景
 */
function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 0.5
  ctx.globalAlpha = 0.3
  
  const gridSize = 50
  
  // 绘制垂直线
  for (let x = gridSize; x < width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  
  // 绘制水平线
  for (let y = gridSize; y < height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  ctx.globalAlpha = 1
}

/**
 * 绘制装饰性图标（显示器图标）
 */
function drawIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  
  // 绘制显示器外框
  const iconWidth = size
  const iconHeight = size * 0.7
  const cornerRadius = 4
  
  ctx.beginPath()
  ctx.roundRect(x - iconWidth/2, y - iconHeight/2, iconWidth, iconHeight, cornerRadius)
  ctx.stroke()
  
  // 绘制屏幕内容区域
  ctx.globalAlpha = 0.3
  ctx.fillRect(x - iconWidth/2 + 4, y - iconHeight/2 + 4, iconWidth - 8, iconHeight - 8)
  ctx.globalAlpha = 1
  
  // 绘制底座
  const standWidth = size * 0.3
  const standHeight = size * 0.15
  ctx.fillRect(x - standWidth/2, y + iconHeight/2, standWidth, standHeight)
  
  // 绘制底座基座
  const baseWidth = size * 0.5
  const baseHeight = 3
  ctx.fillRect(x - baseWidth/2, y + iconHeight/2 + standHeight, baseWidth, baseHeight)
}

/**
 * 生成SVG占位图片（备用方案）
 */
export function generateSVGPlaceholder(options: PlaceholderOptions = {}): string {
  const {
    width = 800,
    height = 600,
    text = '屏幕截图',
    backgroundColor = '#f0f2f5',
    textColor = '#666666',
    borderColor = '#d9d9d9',
    fontSize = 24,
    showTimestamp = true,
    additionalInfo = ''
  } = options

  const timestamp = showTimestamp ? new Date().toLocaleTimeString() : ''
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="${borderColor}" stroke-width="0.5" opacity="0.3"/>
        </pattern>
      </defs>
      
      <!-- 背景 -->
      <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
      
      <!-- 网格 -->
      <rect width="${width}" height="${height}" fill="url(#grid)"/>
      
      <!-- 边框 -->
      <rect x="1" y="1" width="${width-2}" height="${height-2}" fill="none" stroke="${borderColor}" stroke-width="2"/>
      
      <!-- 显示器图标 -->
      <g transform="translate(${width/2}, ${height/2 - 80})">
        <rect x="-20" y="-14" width="40" height="28" fill="none" stroke="${textColor}" stroke-width="2" rx="2"/>
        <rect x="-16" y="-10" width="32" height="20" fill="${textColor}" opacity="0.3"/>
        <rect x="-6" y="14" width="12" height="8" fill="${textColor}"/>
        <rect x="-10" y="22" width="20" height="2" fill="${textColor}"/>
      </g>
      
      <!-- 主文字 -->
      <text x="${width/2}" y="${height/2 - 30}" text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="${fontSize}" font-weight="bold" fill="${textColor}">
        ${text}
      </text>
      
      ${additionalInfo ? `
      <!-- 附加信息 -->
      <text x="${width/2}" y="${height/2 + 10}" text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="${Math.floor(fontSize * 0.7)}" fill="#999999">
        ${additionalInfo}
      </text>
      ` : ''}
      
      ${timestamp ? `
      <!-- 时间戳 -->
      <text x="${width/2}" y="${height/2 + 40}" text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="${Math.floor(fontSize * 0.6)}" fill="#cccccc">
        更新时间: ${timestamp}
      </text>
      ` : ''}
    </svg>
  `
  
  return 'data:image/svg+xml;base64,' + btoa(svg)
}

/**
 * 为客户端生成专用的占位图片
 */
export function generateClientPlaceholder(client: any): string {
  const computerName = client.computerName || client.username || `Client ${client.id?.slice(0, 8) || 'Unknown'}`
  const statusText = getClientStatusText(client.status)
  const additionalInfo = `状态: ${statusText} | IP: ${client.ipAddress || 'N/A'}`
  
  return generatePlaceholderImage({
    text: computerName,
    additionalInfo,
    showTimestamp: true
  })
}

/**
 * 获取客户端状态文本
 */
function getClientStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    online: '在线',
    offline: '离线',
    error: '错误',
    installing: '安装中'
  }
  return statusMap[status] || status
}
