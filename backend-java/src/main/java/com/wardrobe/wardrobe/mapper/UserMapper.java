package com.wardrobe.wardrobe.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wardrobe.wardrobe.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Select("SELECT * FROM users WHERE openid = #{openid} AND status = 1")
    User selectByOpenid(String openid);
}
