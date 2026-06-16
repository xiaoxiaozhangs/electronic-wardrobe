import { View, Text } from '@tarojs/components';
import ECButton from './ECButton';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <View className="empty-state">
      <Text className="empty-state-icon">{icon}</Text>
      <Text className="empty-state-title">{title}</Text>
      {description && (
        <Text className="empty-state-desc">{description}</Text>
      )}
      {action && (
        <ECButton variant="primary" onClick={action.onClick} style={{ marginTop: '32px' }}>
          {action.label}
        </ECButton>
      )}
    </View>
  );
}
