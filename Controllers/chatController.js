const { asyncErrorHandler } = require("../Utiles/Utiles");
const CustomError = require("../Utiles/CustomError");
const { default: mongoose } = require("mongoose");
const Chat = require("../Models/chatModel");

exports.getWithLastMessageUsers = asyncErrorHandler(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;
  const userId = req.user._id;

  const pipeline = [
    {
      $match: {
        $or: [{ sender: userId }, { receiver: userId }],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              {
                case: { $gt: ["$sender", "$receiver"] },
                then: { sender: "$sender", receiver: "$receiver" },
              },
              {
                case: { $lt: ["$sender", "$receiver"] },
                then: { sender: "$receiver", receiver: "$sender" },
              },
            ],
            default: { sender: "$sender", receiver: "$receiver" },
          },
        },
        lastMessage: { $first: "$$ROOT" },
      },
    },
    {
      $lookup: {
        from: "users",
        let: {
          partnerId: {
            $cond: [
              { $eq: ["$lastMessage.sender", userId] },
              "$lastMessage.receiver",
              "$lastMessage.sender",
            ],
          },
        },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$partnerId"] } } },
          { $project: { name: 1, email: 1, photo: 1 } },
        ],
        as: "receiverProfile",
      },
    },
    { $unwind: "$receiverProfile" },
    {
      $project: {
        receiver: "$receiverProfile",
        lastMessage: {
          message: "$lastMessage.message",
          status: "$lastMessage.status",
          messageType: "$lastMessage.messageType",
          media: "$lastMessage.media",
        },
      },
    },
    { $skip: skip },
    { $limit: limit },
  ];

  const conversations = await Chat.aggregate(pipeline);
  if (conversations.length <= 0) {
    return next(new CustomError("This page is not available", 404));
  }
  res.status(200).json({
    status: "success",
    skip: skip,
    page: page,
    data: conversations,
  });
});

// get all messages
exports.getAllMessage = asyncErrorHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const receiverId = new mongoose.Types.ObjectId(req.params.receiverId);
  const senderId = new mongoose.Types.ObjectId(req.user._id);

  const pipeline = [
    {
      $match: {
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId },
        ],
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "users", // Replace with your user collection name
        localField: "sender",
        foreignField: "_id",
        as: "senderDetails",
      },
    },
    {
      $lookup: {
        from: "users", // Replace with your user collection name
        localField: "receiver",
        foreignField: "_id",
        as: "receiverDetails",
      },
    },
    {
      $unwind: "$senderDetails",
    },
    {
      $unwind: "$receiverDetails",
    },
    {
      $project: {
        _id: 1,
        sender: {
          _id: "$senderDetails._id",
          name: "$senderDetails.name",
          email: "$senderDetails.email",
          photo: "$senderDetails.photo",
        },
        receiver: {
          _id: "$receiverDetails._id",
          name: "$receiverDetails.name",
          email: "$receiverDetails.email",
          photo: "$receiverDetails.photo",
        },
        message: 1,
        createdAt: 1,
        messageType: 1,
        status: 1,
        media: 1,
      },
    },
  ];

  const messages = await Chat.aggregate(pipeline);

  if (messages.length <= 0) {
    return next(new CustomError("There is no record found", 404));
  }

  res.status(200).json({
    status: "success",
    total: messages.length,
    page: page,
    limit: limit,
    skip: skip,
    data: {
      messages,
    },
  });
});

// send Message
exports.sendMessage = asyncErrorHandler(async (req, res, next) => {
  const { receiver, message, messageType, media } = req.body;
  const sender = req.user._id; // Assuming the sender's ID is stored in req.user._id

  // Validate the request body as needed

  const newMessage = await Chat.create({
    sender,
    receiver,
    message,
    messageType,
    media, // Only include this if messageType is 'image' or 'video'
    status: "PENDING", // Initial status can be set to 'pending'
  });

  // Additional logic to handle sending notifications or further processing

  res.status(201).json({
    status: "success",
    message: "Successfully added",
    data: {
      message: newMessage,
    },
  });
});

// update Message

exports.updateMessage = asyncErrorHandler(async (req, res, next) => {
  const { messageId, receiverId } = req.params;
  const updateData = req.body;

  // Check if at least one field is provided for update
  if (Object.keys(updateData).length === 0) {
    return next(new CustomError("No fields provided for update", 400));
  }

  // Find and update the message
  const updatedMessage = await Chat.findOneAndUpdate(
    { _id: messageId, receiver: receiverId }, // Ensure that the message belongs to the receiver
    updateData,
    { new: true } // Return the updated document
  );

  if (!updatedMessage) {
    return next(new CustomError("Message not found or receiver mismatch", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      message: updatedMessage,
    },
  });
});

// delete message by message id and reciever id

exports.deleteMessage = asyncErrorHandler(async (req, res, next) => {
  const { messageId, receiverId } = req.params;

  // Check if both senderId and receiverId are provided
  if (!messageId || !receiverId) {
    return next(
      new CustomError("Both message id and receiver ID are required", 400)
    );
  }

  // Find and delete the message
  const deletedMessage = await Chat.findOneAndDelete({
    _id: messageId,
    receiver: receiverId,
  });

  if (!deletedMessage) {
    return next(new CustomError("Message not found or receiver mismatch", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Message deleted successfully",
  });
});

// delete messages by sender id and reciever id

exports.deleteMessages = asyncErrorHandler(async (req, res, next) => {
  const { receiverId } = req.params;
  const senderId = req.user_id; // Assuming the sender's ID is stored in req.user_id

  // Check if both senderId and receiverId are provided
  if (!senderId || !receiverId) {
    return next(
      new CustomError("Both sender and receiver IDs are required", 400)
    );
  }

  // Find and delete the messages
  const result = await Chat.deleteMany({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
  });

  if (result.deletedCount === 0) {
    return next(new CustomError("No messages found to delete", 404));
  }

  res.status(200).json({
    status: "success",
    message: `Deleted ${result.deletedCount} messages successfully`,
  });
});
