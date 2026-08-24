const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Notification = sequelize.define("Notification", {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    // users.username, not users.id -- see create_notifications_table.sql
    recipient_username: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    // Free-form on purpose: see utils/notificationTypes.js. Adding a new type
    // must never require a migration.
    type: {
        type: DataTypes.STRING(64),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    body: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    // Relative frontend path, never absolute
    link: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null
    },
    actor_username: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null
    },
    actor_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
    },
    entity_type: {
        type: DataTypes.STRING(64),
        allowNull: true,
        defaultValue: null
    },
    entity_id: {
        type: DataTypes.STRING(64),
        allowNull: true,
        defaultValue: null
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: "notifications",
    timestamps: true
});

// NOTE: deliberately no Notification.belongsTo(User). models/User.js declares
// `username` as the Sequelize primary key, and any include of User risks leaking
// password/resetToken unless attributes are pinned at every single call site.
// actor_name is denormalized precisely so that join is never needed.

module.exports = Notification;
