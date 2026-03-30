import { Empty, theme, type EmptyProps } from 'antd';

/**
 * 统一空状态：简单插画 + 次要色说明文案（桌面/Web 一致）。
 */
export function AaaflowEmpty({ styles, image = Empty.PRESENTED_IMAGE_SIMPLE, ...rest }: EmptyProps) {
  const { token } = theme.useToken();
  return (
    <Empty
      image={image}
      styles={{
        ...styles,
        description: {
          color: token.colorTextSecondary,
          ...styles?.description,
        },
      }}
      {...rest}
    />
  );
}
