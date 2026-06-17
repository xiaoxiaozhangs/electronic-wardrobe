import { View, Text } from '@tarojs/components';
import { hapticLight } from '../utils/haptic';

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
  const handleAction = () => {
    if (action) {
      hapticLight();
      action.onClick();
    }
  };

  return (
    <View className="empty-state">
      <Text className="empty-state-icon">{icon}</Text>
      <Text className="empty-state-title">{title}</Text>
      {description && (
        <Text className="empty-state-desc">{description}</Text>
      )}
      {action && (
        <View className="btn-primary btn-press" style={{ marginTop: '32px' }} onClick={handleAction}>
          {action.label}
        </View>
      )}
    </View>
  );
}
