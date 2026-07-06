const isAllowedSource = ({
  userId,
  groupId,
  allowedUserIds = [],
  allowedGroupIds = [],
} = {}) => {
  const hasUserAllowlist = allowedUserIds.length > 0;
  const hasGroupAllowlist = allowedGroupIds.length > 0;
  const userAllowed = !hasUserAllowlist || allowedUserIds.includes(userId);
  const groupAllowed = !groupId || !hasGroupAllowlist || allowedGroupIds.includes(groupId);
  return {
    isAllowed: userAllowed && groupAllowed,
    userAllowed,
    groupAllowed,
  };
};

export {
  isAllowedSource,
};

export default isAllowedSource;
